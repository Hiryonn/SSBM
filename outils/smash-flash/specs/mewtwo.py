SPEC = dict(
    name='Mewtwo', sheet='mewtwo2.png', credit='McBacon / SSF', sounds='Mewtwo', height=64,
    anims=dict(
        idle=['0.0', '0.1'], walk='8.0-8.3', run=['6.3', '6.4'], crouch=['0.2'], jumpSquat=['0.2'],
        jump=['5.4'], doubleJump=['5.5', '5.3'], fall=['5.5'], land=['0.2'],
        shield=['3.11'], dodge=['1.0'], roll=['6.3', '6.4'], hurt=['6.4'], hurtAir=['6.5'], tumble=['6.4', '6.5'],
        lie=['12.7'], getup=['0.2'], taunt=['3.9', '3.10'], win=['3.9'],
        jab=['9.0', '9.1'], ftilt=['9.2', '9.1'], utilt=['4.1', '4.2'], dtilt=['4.4', '4.5'], dash=['6.3', '9.2'],
        fsmash='9.3-9.7', usmash=['10.0', '10.1'], dsmash='10.4-10.6',
        nair=['3.0', '3.1'], fair=['5.0', '5.1'], uair=['4.2', '4.3'], dair=['5.6', '5.2'],
        neutralB='12.0-12.5', sideB=['8.4', '8.5', '8.6'], upB=['6.0', '6.1', '6.2'], downB=['0.3', '0.4'],
        grab=['9.0', '8.4'], proj='11.8-11.11',
    ),
    times=dict(idle=20, walk=8, fsmash=[8, 4, 4, 4, 10], neutralB=6, upB=[6, 6, 6]),
    proj_move=dict(move='neutralB', at=5, vx=5.5, vy=0, gravity=0.0, life=70, dmg=14, no_melee=True),
    moves=dict(upB=dict(vy=-10, helpless=True), sideB=dict(hit=dict(dmg=8, angle=135))),
    stats=dict(weight=85, walkSpeed=1.2, runSpeed=2.7, jumpForce=8.0, doubleJumpForce=8.0, gravity=0.3, fallSpeed=2.6),
)
