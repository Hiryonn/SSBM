SPEC = dict(
    name='Mr. Game & Watch', sheet='gamewatch25ra.png', credit='SSF', sounds='Game and Watch', height=54,
    anims=dict(
        idle=['1.0'], walk=['1.0', '1.1'], run=['1.1', '1.2'], crouch=['19.1'], jumpSquat=['19.1'],
        jump=['9.0'], doubleJump=['9.0', '5.0'], fall=['9.0'], land=['19.1'],
        shield=['19.1'], dodge=['4.0'], roll=['5.0', '9.0'], hurt=['5.1'], hurtAir=['5.1'], tumble=['5.1', '9.0'],
        lie=['10.0'], getup=['19.1'], taunt=['25.0', '25.1'], win=['17.0'],
        jab=['3.0', '3.1'], ftilt=['3.6'], utilt=['3.3'], dtilt=['6.0'], dash=['5.3'],
        fsmash=['3.0', '3.5'], usmash=['3.3', '5.0'], dsmash=['3.4'],
        nair=['9.0'], fair=['5.3'], uair=['3.3'], dair=['3.2'],
        neutralB=['20.0', '20.1'], sideB=['15.0'], upB=['9.0', '5.0'], downB='23.0-23.5',
        grab=['3.1', '3.6'], proj=['20.2', '20.3', '20.4', '20.5'],
    ),
    times=dict(walk=10, run=6, idle=30, taunt=10, sideB=[24], downB=5, fsmash=[12, 16]),
    proj_move=dict(move='neutralB', at=1, vx=4, vy=-4, gravity=0.25, life=60, dmg=5, no_melee=True),
    moves=dict(upB=dict(vy=-10, helpless=True), sideB=dict(hit=dict(dmg=15)), downB=dict(hit=dict(dmg=18)),
               fsmash=dict(hit=dict(dmg=17))),
    stats=dict(weight=75, walkSpeed=1.2, runSpeed=2.6, jumpForce=8.4, doubleJumpForce=7.8),
)
