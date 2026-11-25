SPEC = dict(
    name='Naruto', sheet='naruto.gif', credit='SSF', sounds='Naruto', height=54,
    anims=dict(
        idle='5.1-5.3', walk=['50.1', '50.2'], run=['8.1', '8.2'], crouch=['25.1'], jumpSquat=['25.1'],
        jump=['10.1'], doubleJump=['15.2', '15.3', '15.4'], fall=['15.5'], land=['25.1'],
        shield='11.2-11.4', dodge=['46.4'], roll=['15.3', '15.4'], hurt=['51.1'], hurtAir=['51.2'], tumble=['15.3', '15.4'],
        lie=['54.2'], getup=['25.1'], dizzy=['53.3'], taunt=['18.1', '18.2'], win=['53.1', '53.2'],
        jab=['29.1', '29.2'], ftilt=['28.1', '28.2'], utilt=['28.3'], dtilt=['25.2'], dash='31.1-31.3',
        fsmash='33.0-33.2', usmash=['38.1', '38.2'], dsmash=['31.3', '31.4'],
        nair=['38.2'], fair=['42.1', '42.2'], uair=['38.1'], dair=['38.3'],
        neutralB=['32.0', '30.4'], sideB=['47.1', '47.2'], upB=['38.1', '38.2'], downB=['28.4', '28.5', '28.6'],
        grab=['30.4', '30.5'], proj='32.2-32.4',
    ),
    times=dict(idle=14, walk=8, run=5, shield=6, downB=[10, 10, 20], fsmash=[10, 5, 12]),
    proj_move=dict(move='neutralB', at=1, vx=6.5, vy=0, gravity=0.0, life=50, dmg=9, no_melee=True),
    moves=dict(upB=dict(vy=-9, helpless=True), sideB=dict(hit=dict(dmg=10)), downB=dict(hit=dict(dmg=16, bkb=40))),
    stats=dict(weight=92, walkSpeed=1.4, runSpeed=3.2, jumpForce=8.6, doubleJumpForce=7.8),
)
