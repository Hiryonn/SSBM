SPEC = dict(
    name='Zero', sheet='x3zero8nv.png', credit='Capcom / SSF', sounds='Zero', height=58,
    anims=dict(
        idle='0.0-0.3', walk='0.9-0.14', run=['0.6', '0.7', '0.9', '0.10'], crouch=['2.0'], jumpSquat=['2.0'],
        jump=['1.0', '1.1'], doubleJump='1.12-1.14', fall=['1.2'], land=['2.0'],
        shield=['2.1'], dodge=['7.3'], roll=['1.6', '1.7'], hurt=['4.9'], hurtAir=['5.16'], tumble=['1.12', '1.13'],
        lie=['1.8'], getup=['2.0'], taunt=['0.17'], win=['3.0'],
        jab=['4.0', '4.1'], ftilt=['4.16', '4.17', '4.18'], utilt=['6.3', '6.4'], dtilt=['6.8', '6.9'], dash='5.0-5.2',
        fsmash=['6.5', '6.6', '6.7'], usmash=['4.16', '4.17'], dsmash=['6.10', '6.11'],
        nair='6.3-6.5', fair=['4.17', '4.18'], uair=['6.4'], dair=['5.11', '5.12'],
        neutralB=['4.4', '4.5'], sideB='5.0-5.4', upB=['6.6', '6.7'], downB=['7.0', '7.1'],
        grab=['4.0', '4.2'], proj='8.9-8.12',
    ),
    times=dict(idle=10, walk=5, run=4, fsmash=[10, 4, 10], sideB=4),
    proj_move=dict(move='neutralB', at=1, vx=7.5, vy=0, gravity=0.0, life=45, dmg=8, no_melee=True),
    moves=dict(upB=dict(vy=-9.5, helpless=True), sideB=dict(vx=7, hit=dict(dmg=11)), downB=dict(hit=dict(dmg=16, angle=60))),
    stats=dict(weight=95, walkSpeed=1.5, runSpeed=3.3, jumpForce=8.8, doubleJumpForce=7.8),
)
